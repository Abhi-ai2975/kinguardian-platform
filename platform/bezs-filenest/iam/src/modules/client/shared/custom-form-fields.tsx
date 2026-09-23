import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HTMLInputTypeAttribute } from "react";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";

type FormControlProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> = {
  name: TName;
  label?: React.ReactNode;
  description?: React.ReactNode;
  control: ControllerProps<TFieldValues, TName, TTransformedValues>["control"];
};

type TFormBaseProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> = FormControlProps<TFieldValues, TName, TTransformedValues> & {
  horizontal?: boolean;
  controlFirst?: boolean;
  descriptionPlace?: "top" | "bottom";
  children: (
    field: Parameters<
      ControllerProps<TFieldValues, TName, TTransformedValues>["render"]
    >[0]["field"] & { "aria-invalid": boolean; id: string },
  ) => React.ReactNode;
};

type TFormControlFunc<
  ExtraProps extends Record<string, unknown> = Record<never, never>,
> = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(
  props: FormControlProps<TFieldValues, TName, TTransformedValues> &
    ExtraProps & {
      className?: string;
      placeholder?: string;
      type?: HTMLInputTypeAttribute;
    },
) => React.ReactNode;

function FormBase<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>({
  children,
  control,
  label,
  name,
  description,
  controlFirst,
  descriptionPlace = "top",
  horizontal,
}: TFormBaseProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const labelOnly = <FieldLabel htmlFor={field.name}>{label}</FieldLabel>;

        const descriptionElem = description && (
          <FieldDescription>{description}</FieldDescription>
        );

        const control = children({
          ...field,
          id: field.name,
          "aria-invalid": fieldState.invalid,
        });

        const errorElem = fieldState.invalid && (
          <FieldError errors={[fieldState.error]} />
        );

        return (
          <Field
            data-invalid={fieldState.invalid}
            orientation={horizontal ? "horizontal" : undefined}
            className="gap-2"
          >
            {controlFirst ? (
              <>
                {control}

                <FieldContent>
                  {labelOnly}

                  {/* Description placement */}
                  {descriptionPlace === "top" && descriptionElem}

                  {errorElem}

                  {descriptionPlace === "bottom" && descriptionElem}
                </FieldContent>
              </>
            ) : (
              <>
                <FieldContent>
                  {labelOnly}

                  {descriptionPlace === "top" && description && (
                    <FieldDescription>{description}</FieldDescription>
                  )}

                  {control}

                  {descriptionPlace === "bottom" && description && (
                    <FieldDescription>{description}</FieldDescription>
                  )}

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>
              </>
            )}
          </Field>
        );
      }}
    />
  );
}

export const FormInput: TFormControlFunc<{
  controlFirst?: boolean;
  descriptionPlace?: "top" | "bottom";
}> = ({ className, placeholder, type, ...props }) => {
  return (
    <FormBase {...props}>
      {(field) => (
        <Input
          {...field}
          value={field.value ?? ""}
          placeholder={placeholder}
          className={className}
          type={type}
        />
      )}
    </FormBase>
  );
};

export const FormTextarea: TFormControlFunc<{
  descriptionPlace?: "top" | "bottom";
}> = ({ className, placeholder, ...props }) => {
  return (
    <FormBase {...props}>
      {(field) => (
        <Textarea
          {...field}
          className={className}
          placeholder={placeholder}
          value={field.value ?? ""}
        />
      )}
    </FormBase>
  );
};

export const FormSelect: TFormControlFunc<{
  children: React.ReactNode;
  customValue?: any;
  descriptionPlace?: "top" | "bottom";
  onCustomChange?: (value: string) => void;
}> = ({ children, className, placeholder, customValue, ...props }) => {
  return (
    <FormBase {...props}>
      {({ onChange, onBlur, ...field }) => (
        <Select
          {...field}
          onValueChange={(val) => {
            if (props.onCustomChange) {
              props.onCustomChange(val);
              return;
            }
            onChange(val);
          }}
          value={customValue ?? field.value ?? ""}
        >
          <SelectTrigger
            aria-invalid={field["aria-invalid"]}
            id={field.id}
            onBlur={onBlur}
            className={className}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>{children}</SelectContent>
        </Select>
      )}
    </FormBase>
  );
};

export const FormCheckbox: TFormControlFunc<{
  descriptionPlace?: "top" | "bottom";
}> = ({ className, ...props }) => {
  return (
    <FormBase {...props} horizontal controlFirst>
      {({ onChange, value, ...field }) => (
        <Checkbox
          {...field}
          checked={value}
          onCheckedChange={onChange}
          className={className}
        />
      )}
    </FormBase>
  );
};

export const FormRadioGroup: TFormControlFunc<{
  children: React.ReactNode;
  descriptionPlace?: "top" | "bottom";
}> = ({ children, className, ...props }) => {
  return (
    <FormBase {...props}>
      {({ onChange, value, id, ...field }) => (
        <RadioGroup
          {...field}
          id={id}
          value={
            value === true ? "true" : value === false ? "false" : (value ?? "")
          }
          onValueChange={(val) => {
            if (val === "true") onChange(true);
            else if (val === "false") onChange(false);
            else onChange(val);
          }}
          className={className}
        >
          {children}
        </RadioGroup>
      )}
    </FormBase>
  );
};

export const FormSwitch: TFormControlFunc<{
  children?: React.ReactNode;
  childrenFirst?: boolean;
  containerClass?: string;
  descriptionPlace?: "top" | "bottom";
}> = ({
  className,
  children,
  childrenFirst = false,
  containerClass,
  ...props
}) => {
  return (
    <FormBase {...props}>
      {({ value, onChange, ...field }) => (
        <div
          className={cn(
            `flex items-center gap-3 h-full`,
            childrenFirst ? "flex-row-reverse" : "flex-row",
            containerClass,
          )}
        >
          <Switch
            {...field}
            checked={value}
            onCheckedChange={onChange}
            className={className}
          />
          {children ?? null}
        </div>
      )}
    </FormBase>
  );
};

export const FormSlider: TFormControlFunc<{
  min?: number;
  max?: number;
  step?: number;
  descriptionPlace?: "top" | "bottom";
}> = ({ min = 0, max = 100, step = 1, className, ...props }) => {
  return (
    <FormBase {...props}>
      {({ value, onChange, ...field }) => (
        <Slider
          {...field}
          value={[value ?? min]}
          min={min}
          max={max}
          step={step}
          onValueChange={(val: any) => onChange(val[0])}
          className={className}
        />
      )}
    </FormBase>
  );
};
